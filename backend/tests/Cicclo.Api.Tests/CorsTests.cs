using System.Net;
using Cicclo.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Xunit;

namespace Cicclo.Api.Tests;

public sealed class CorsTests
{
    [Theory]
    [InlineData("http://localhost:8081")]
    [InlineData("http://127.0.0.1:8081")]
    public async Task GetWallet_FromExpoDevelopmentOrigin_AllowsCrossOriginRequest(string origin)
    {
        using var factory = new ApiFactory();
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/wallet");
        request.Headers.Add("Origin", origin);

        using var response = await factory.CreateClient().SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(origin, response.Headers.GetValues("Access-Control-Allow-Origin").Single());
    }

    [Fact]
    public async Task GetWallet_FromUnknownOrigin_DoesNotAllowCrossOriginRequest()
    {
        using var factory = new ApiFactory();
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/wallet");
        request.Headers.Add("Origin", "http://example.com");

        using var response = await factory.CreateClient().SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task GetWallet_FromExpoPreviewOrigin_AllowsCrossOriginRequestInProduction()
    {
        using var factory = new ApiFactory().WithWebHostBuilder(builder =>
            builder.UseEnvironment("Production"));
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/wallet");
        request.Headers.Add("Origin", "http://localhost:8081");

        using var response = await factory.CreateClient().SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(
            "http://localhost:8081",
            response.Headers.GetValues("Access-Control-Allow-Origin").Single());
    }

    [Fact]
    public async Task Preflight_FromExpoPreviewOrigin_AllowsOrderRequestHeaders()
    {
        using var factory = new ApiFactory();
        using var request = new HttpRequestMessage(HttpMethod.Options, "/api/v1/orders");
        request.Headers.Add("Origin", "http://localhost:8081");
        request.Headers.Add("Access-Control-Request-Method", "POST");
        request.Headers.Add("Access-Control-Request-Headers", "content-type,idempotency-key");

        using var response = await factory.CreateClient().SendAsync(request);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(
            "http://localhost:8081",
            response.Headers.GetValues("Access-Control-Allow-Origin").Single());
        Assert.Contains(
            "idempotency-key",
            response.Headers.GetValues("Access-Control-Allow-Headers").Single().ToLowerInvariant());
    }
}
