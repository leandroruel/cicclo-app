using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Cicclo.Api.Contracts;
using Cicclo.Api.Tests.Infrastructure;
using Xunit;

namespace Cicclo.Api.Tests;

public sealed class OrdersTests
{
    [Fact]
    public async Task CreateOrders_FollowsReferenceScenarioAndPreservesBalanceOnInsufficientFunds()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var wash = await CreateOrderAsync(client, 1, Guid.NewGuid());
        using var dry = await CreateOrderAsync(client, 2, Guid.NewGuid());
        using var insufficient = await CreateOrderAsync(client, 1, Guid.NewGuid());

        Assert.Equal(HttpStatusCode.Created, wash.StatusCode);
        Assert.Equal(HttpStatusCode.Created, dry.StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, insufficient.StatusCode);
        Assert.NotNull(wash.Headers.Location);

        var washOrder = await wash.Content.ReadFromJsonAsync<OrderResponse>();
        var dryOrder = await dry.Content.ReadFromJsonAsync<OrderResponse>();
        Assert.NotNull(washOrder);
        Assert.NotNull(dryOrder);
        Assert.Equal("Lavagem", washOrder.ServiceName);
        Assert.Equal(18.90m, washOrder.Price);
        Assert.Equal(31.10m, washOrder.WalletBalance);
        Assert.Equal("Confirmed", washOrder.Status);
        using var orderDetailsResponse = await client.GetAsync(wash.Headers.Location);
        var orderDetails = await orderDetailsResponse.Content.ReadFromJsonAsync<OrderResponse>();
        Assert.Equal(HttpStatusCode.OK, orderDetailsResponse.StatusCode);
        Assert.Equal(washOrder, orderDetails);
        Assert.Equal(10.20m, dryOrder.WalletBalance);

        using var problem = await JsonDocument.ParseAsync(await insufficient.Content.ReadAsStreamAsync());
        Assert.Equal("insufficient_balance", problem.RootElement.GetProperty("code").GetString());
        Assert.Equal(10.20m, problem.RootElement.GetProperty("balance").GetDecimal());
        Assert.Equal(18.90m, problem.RootElement.GetProperty("required").GetDecimal());

        using var walletResponse = await client.GetAsync("/api/v1/wallet");
        var wallet = await walletResponse.Content.ReadFromJsonAsync<WalletResponse>();
        Assert.NotNull(wallet);
        Assert.Equal(10.20m, wallet.Balance);
    }

    [Fact]
    public async Task CreateOrder_WhenServiceDoesNotExist_ReturnsNotFoundWithoutDebiting()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await CreateOrderAsync(client, 999, Guid.NewGuid());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        using var problem = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        Assert.Equal("service_not_found", problem.RootElement.GetProperty("code").GetString());

        using var walletResponse = await client.GetAsync("/api/v1/wallet");
        var wallet = await walletResponse.Content.ReadFromJsonAsync<WalletResponse>();
        Assert.NotNull(wallet);
        Assert.Equal(50m, wallet.Balance);
    }

    [Fact]
    public async Task CreateOrder_WhenRequestIsRetriedWithSameKey_ReturnsOriginalOrderWithoutSecondDebit()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        var key = Guid.NewGuid();

        using var firstResponse = await CreateOrderAsync(client, 1, key);
        using var replayResponse = await CreateOrderAsync(client, 1, key);

        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, replayResponse.StatusCode);
        Assert.Equal("true", replayResponse.Headers.GetValues("Idempotent-Replayed").Single());

        var firstOrder = await firstResponse.Content.ReadFromJsonAsync<OrderResponse>();
        var replayedOrder = await replayResponse.Content.ReadFromJsonAsync<OrderResponse>();
        Assert.NotNull(firstOrder);
        Assert.Equal(firstOrder, replayedOrder);

        using var walletResponse = await client.GetAsync("/api/v1/wallet");
        var wallet = await walletResponse.Content.ReadFromJsonAsync<WalletResponse>();
        Assert.NotNull(wallet);
        Assert.Equal(31.10m, wallet.Balance);
    }

    [Fact]
    public async Task CreateOrder_WhenKeyIsReusedForAnotherService_Returns422WithoutDebitingAgain()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        var key = Guid.NewGuid();

        using var firstResponse = await CreateOrderAsync(client, 1, key);
        using var conflictResponse = await CreateOrderAsync(client, 2, key);

        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, conflictResponse.StatusCode);
        using var problem = await JsonDocument.ParseAsync(await conflictResponse.Content.ReadAsStreamAsync());
        Assert.Equal("idempotency_key_mismatch", problem.RootElement.GetProperty("code").GetString());

        using var walletResponse = await client.GetAsync("/api/v1/wallet");
        var wallet = await walletResponse.Content.ReadFromJsonAsync<WalletResponse>();
        Assert.NotNull(wallet);
        Assert.Equal(31.10m, wallet.Balance);
    }

    [Fact]
    public async Task CreateOrder_WhenBalanceEqualsPrice_SucceedsAndSetsBalanceToZero()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        using var firstOrder = await CreateOrderAsync(client, 1, Guid.NewGuid());
        using var secondOrder = await CreateOrderAsync(client, 2, Guid.NewGuid());
        using var creditResponse = await CreditWalletAsync(client, 8.70m, Guid.NewGuid());
        Assert.Equal(HttpStatusCode.Created, firstOrder.StatusCode);
        Assert.Equal(HttpStatusCode.Created, secondOrder.StatusCode);
        Assert.Equal(HttpStatusCode.OK, creditResponse.StatusCode);

        using var orderResponse = await CreateOrderAsync(client, 1, Guid.NewGuid());

        Assert.Equal(HttpStatusCode.Created, orderResponse.StatusCode);
        var order = await orderResponse.Content.ReadFromJsonAsync<OrderResponse>();
        Assert.NotNull(order);
        Assert.Equal(0m, order.WalletBalance);
    }

    [Fact]
    public async Task CreateOrder_WhenIdempotencyKeyIsMissingOrInvalid_ReturnsBadRequest()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        using var missingKeyRequest = new HttpRequestMessage(HttpMethod.Post, "/api/v1/orders")
        {
            Content = JsonContent.Create(new CreateOrderRequest { ServiceId = 1 })
        };
        using var missingKeyResponse = await client.SendAsync(missingKeyRequest);
        using var invalidKeyResponse = await CreateOrderAsync(client, 1, "not-a-uuid");

        Assert.Equal(HttpStatusCode.BadRequest, missingKeyResponse.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, invalidKeyResponse.StatusCode);
    }

    [Fact]
    public async Task CreateOrder_WhenRequestsRunConcurrently_NeverMakesBalanceNegative()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        var tasks = Enumerable.Range(0, 5)
            .Select(_ => CreateOrderAsync(client, 1, Guid.NewGuid()))
            .ToArray();
        var responses = await Task.WhenAll(tasks);

        try
        {
            Assert.All(
                responses,
                response => Assert.Contains(
                    response.StatusCode,
                    new[]
                    {
                        HttpStatusCode.Created,
                        HttpStatusCode.UnprocessableEntity,
                        HttpStatusCode.Conflict
                    }));

            var successfulOrders = responses.Count(response => response.StatusCode == HttpStatusCode.Created);
            Assert.InRange(successfulOrders, 1, 2);

            using var walletResponse = await client.GetAsync("/api/v1/wallet");
            var wallet = await walletResponse.Content.ReadFromJsonAsync<WalletResponse>();
            Assert.NotNull(wallet);
            Assert.Equal(50m - successfulOrders * 18.90m, wallet.Balance);
            Assert.True(wallet.Balance >= 0);
        }
        finally
        {
            foreach (var response in responses)
            {
                response.Dispose();
            }
        }
    }

    [Fact]
    public async Task CreateOrder_WhenBodyIsInvalid_ReturnsValidationErrorCode()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/orders")
        {
            Content = JsonContent.Create(new { serviceId = 0 })
        };
        request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString());

        using var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var problem = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        Assert.Equal("validation_error", problem.RootElement.GetProperty("code").GetString());
    }

    private static Task<HttpResponseMessage> CreateOrderAsync(HttpClient client, int serviceId, Guid key) =>
        CreateOrderAsync(client, serviceId, key.ToString());

    private static async Task<HttpResponseMessage> CreateOrderAsync(
        HttpClient client,
        int serviceId,
        string key)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/orders")
        {
            Content = JsonContent.Create(new CreateOrderRequest { ServiceId = serviceId })
        };
        request.Headers.Add("Idempotency-Key", key);
        return await client.SendAsync(request);
    }

    private static async Task<HttpResponseMessage> CreditWalletAsync(
        HttpClient client,
        decimal amount,
        Guid key)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/wallet/credits")
        {
            Content = JsonContent.Create(new CreditWalletRequest { Amount = amount })
        };
        request.Headers.Add("Idempotency-Key", key.ToString());
        return await client.SendAsync(request);
    }
}
