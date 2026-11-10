using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Cicclo.Api.Contracts;
using Cicclo.Api.Tests.Infrastructure;
using Xunit;

namespace Cicclo.Api.Tests;

public sealed class WalletTests
{
    [Fact]
    public async Task GetWallet_ReturnsSeededWallet()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        using var response = await client.GetAsync("/api/v1/wallet");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var wallet = await response.Content.ReadFromJsonAsync<WalletResponse>();
        Assert.NotNull(wallet);
        Assert.Equal(Guid.Parse("5b1f0c1e-7a34-4c53-9c0e-2f6f4a1d9a10"), wallet.Id);
        Assert.Equal(50.00m, wallet.Balance);
        Assert.Equal("BRL", wallet.Currency);
    }

    [Fact]
    public async Task CreditWallet_WhenRequestIsRepeatedWithSameKey_CreditsOnlyOnce()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        using var firstResponse = await CreditAsync(client, 50m, "credit-50");
        using var retryResponse = await CreditAsync(client, 50m, "credit-50");

        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, retryResponse.StatusCode);

        var firstWallet = await firstResponse.Content.ReadFromJsonAsync<WalletResponse>();
        var retryWallet = await retryResponse.Content.ReadFromJsonAsync<WalletResponse>();
        Assert.NotNull(firstWallet);
        Assert.NotNull(retryWallet);
        Assert.Equal(100m, firstWallet.Balance);
        Assert.Equal(firstWallet, retryWallet);

        using var currentResponse = await client.GetAsync("/api/v1/wallet");
        var currentWallet = await currentResponse.Content.ReadFromJsonAsync<WalletResponse>();
        Assert.NotNull(currentWallet);
        Assert.Equal(100m, currentWallet.Balance);
    }

    [Fact]
    public async Task CreditWallet_WhenKeyIsReusedWithDifferentAmount_ReturnsConflictWithoutCreditingAgain()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        using var firstResponse = await CreditAsync(client, 50m, "credit-50");
        using var conflictResponse = await CreditAsync(client, 25m, "credit-50");

        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, conflictResponse.StatusCode);

        using var problem = await JsonDocument.ParseAsync(await conflictResponse.Content.ReadAsStreamAsync());
        Assert.Equal(
            "idempotency_key_mismatch",
            problem.RootElement.GetProperty("code").GetString());

        using var currentResponse = await client.GetAsync("/api/v1/wallet");
        var currentWallet = await currentResponse.Content.ReadFromJsonAsync<WalletResponse>();
        Assert.NotNull(currentWallet);
        Assert.Equal(100m, currentWallet.Balance);
    }

    private static async Task<HttpResponseMessage> CreditAsync(
        HttpClient client,
        decimal amount,
        string idempotencyKey)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/wallet/credits")
        {
            Content = JsonContent.Create(new CreditWalletRequest { Amount = amount })
        };
        request.Headers.Add("Idempotency-Key", idempotencyKey);
        return await client.SendAsync(request);
    }
}
