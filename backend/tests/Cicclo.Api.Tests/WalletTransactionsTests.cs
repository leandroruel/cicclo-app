using System.Net;
using System.Net.Http.Json;
using Cicclo.Api.Contracts;
using Cicclo.Api.Tests.Infrastructure;
using Xunit;

namespace Cicclo.Api.Tests;

public sealed class WalletTransactionsTests
{
    [Fact]
    public async Task GetTransactions_WhenLedgerIsEmpty_ReturnsEmptyList()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/v1/wallet/transactions");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<WalletTransactionListResponse>();
        Assert.NotNull(result);
        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task GetTransactions_IncludesWalletCreditsWithoutOrderReference()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        using var creditRequest = new HttpRequestMessage(HttpMethod.Post, "/api/v1/wallet/credits")
        {
            Content = JsonContent.Create(new CreditWalletRequest { Amount = 25m })
        };
        creditRequest.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString());

        using var creditResponse = await client.SendAsync(creditRequest);
        Assert.Equal(HttpStatusCode.OK, creditResponse.StatusCode);

        using var response = await client.GetAsync("/api/v1/wallet/transactions");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<WalletTransactionListResponse>();
        Assert.NotNull(result);
        var credit = Assert.Single(result.Items);
        Assert.Equal("Credit", credit.Type);
        Assert.Equal(25m, credit.Amount);
        Assert.Equal(75m, credit.BalanceAfter);
        Assert.Null(credit.OrderId);
        Assert.NotEqual(default, credit.CreatedAt);
    }

    [Fact]
    public async Task GetTransactions_ReturnsOrderDebitsNewestFirstWithBalancesAndOrderReferences()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        var firstKey = Guid.NewGuid();
        var firstOrder = await CreateOrderAsync(client, 1, firstKey);
        await Task.Delay(20);
        var secondOrder = await CreateOrderAsync(client, 2, Guid.NewGuid());

        using var response = await client.GetAsync("/api/v1/wallet/transactions");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<WalletTransactionListResponse>();
        Assert.NotNull(result);
        Assert.Collection(
            result.Items,
            transaction =>
            {
                Assert.NotEqual(Guid.Empty, transaction.Id);
                Assert.Equal("Debit", transaction.Type);
                Assert.Equal(20.90m, transaction.Amount);
                Assert.Equal(10.20m, transaction.BalanceAfter);
                Assert.Equal(secondOrder.Id, transaction.OrderId);
                Assert.Equal(secondOrder.CreatedAt, transaction.CreatedAt);
            },
            transaction =>
            {
                Assert.NotEqual(Guid.Empty, transaction.Id);
                Assert.Equal("Debit", transaction.Type);
                Assert.Equal(18.90m, transaction.Amount);
                Assert.Equal(31.10m, transaction.BalanceAfter);
                Assert.Equal(firstOrder.Id, transaction.OrderId);
                Assert.Equal(firstOrder.CreatedAt, transaction.CreatedAt);
            });
        Assert.Equal(2, result.Items.Select(transaction => transaction.Id).Distinct().Count());
    }

    [Fact]
    public async Task GetTransactions_WhenOrderIsRetriedWithSameKey_DoesNotDuplicateTransaction()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        var key = Guid.NewGuid();

        var order = await CreateOrderAsync(client, 1, key);
        using var replayResponse = await RequestOrderAsync(client, 1, key);

        Assert.Equal(HttpStatusCode.OK, replayResponse.StatusCode);
        Assert.Equal("true", replayResponse.Headers.GetValues("Idempotent-Replayed").Single());

        using var response = await client.GetAsync("/api/v1/wallet/transactions");
        var result = await response.Content.ReadFromJsonAsync<WalletTransactionListResponse>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(result);
        var transaction = Assert.Single(result.Items);
        Assert.Equal(order.Id, transaction.OrderId);
        Assert.Equal(18.90m, transaction.Amount);
    }

    [Fact]
    public async Task GetTransactions_WhenServiceDoesNotExist_ReturnsNoTransaction()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        using var orderResponse = await RequestOrderAsync(client, 999, Guid.NewGuid());

        Assert.Equal(HttpStatusCode.NotFound, orderResponse.StatusCode);

        using var response = await client.GetAsync("/api/v1/wallet/transactions");
        var result = await response.Content.ReadFromJsonAsync<WalletTransactionListResponse>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(result);
        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task GetTransactions_WhenOrderFailsForInsufficientBalance_DoesNotAddTransaction()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        await CreateOrderAsync(client, 1, Guid.NewGuid());
        await CreateOrderAsync(client, 2, Guid.NewGuid());
        using var rejectedOrder = await RequestOrderAsync(client, 1, Guid.NewGuid());

        Assert.Equal(HttpStatusCode.UnprocessableEntity, rejectedOrder.StatusCode);

        using var response = await client.GetAsync("/api/v1/wallet/transactions");
        var result = await response.Content.ReadFromJsonAsync<WalletTransactionListResponse>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(result);
        Assert.Equal(2, result.Items.Count);
        Assert.Equal(new[] { 10.20m, 31.10m }, result.Items.Select(item => item.BalanceAfter));
    }

    private static async Task<OrderResponse> CreateOrderAsync(HttpClient client, int serviceId, Guid key)
    {
        using var response = await RequestOrderAsync(client, serviceId, key);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var order = await response.Content.ReadFromJsonAsync<OrderResponse>();
        Assert.NotNull(order);
        return order;
    }

    private static async Task<HttpResponseMessage> RequestOrderAsync(HttpClient client, int serviceId, Guid key)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/orders")
        {
            Content = JsonContent.Create(new { serviceId })
        };
        request.Headers.Add("Idempotency-Key", key.ToString());
        return await client.SendAsync(request);
    }
}
