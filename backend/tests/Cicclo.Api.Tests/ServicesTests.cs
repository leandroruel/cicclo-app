using System.Net;
using System.Net.Http.Json;
using Cicclo.Api.Contracts;
using Cicclo.Api.Tests.Infrastructure;
using Cicclo.Domain.Services;
using Cicclo.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Cicclo.Api.Tests;

public sealed class ServicesTests
{
    [Fact]
    public async Task GetServices_ReturnsActiveSeededServicesAndOmitsInactiveServices()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            dbContext.Services.Add(new LaundryService(3, "Serviço inativo", 25m, active: false));
            await dbContext.SaveChangesAsync();
        }

        using var response = await client.GetAsync("/api/v1/services");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ServiceListResponse>();
        Assert.NotNull(result);
        Assert.Collection(
            result.Items,
            service =>
            {
                Assert.Equal(1, service.Id);
                Assert.Equal("Lavagem", service.Name);
                Assert.Equal(18.90m, service.Price);
                Assert.Equal("BRL", service.Currency);
            },
            service =>
            {
                Assert.Equal(2, service.Id);
                Assert.Equal("Secagem", service.Name);
                Assert.Equal(20.90m, service.Price);
                Assert.Equal("BRL", service.Currency);
            });
    }

    [Fact]
    public async Task GetServices_WhenNoServicesAreActive_ReturnsEmptyList()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var services = await dbContext.Services.ToListAsync();
            foreach (var service in services)
            {
                dbContext.Entry(service).Property(item => item.Active).CurrentValue = false;
            }

            await dbContext.SaveChangesAsync();
        }

        using var response = await client.GetAsync("/api/v1/services");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ServiceListResponse>();
        Assert.NotNull(result);
        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task GetServiceById_WhenServiceIsActive_ReturnsServiceDetails()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/v1/services/1");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var service = await response.Content.ReadFromJsonAsync<ServiceResponse>();
        Assert.Equal(new ServiceResponse(1, "Lavagem", 18.90m, "BRL"), service);
    }

    [Theory]
    [InlineData(999)]
    [InlineData(3)]
    public async Task GetServiceById_WhenServiceDoesNotExistOrIsInactive_ReturnsNotFound(int id)
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        if (id == 3)
        {
            await using var scope = factory.Services.CreateAsyncScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            dbContext.Services.Add(new LaundryService(3, "Serviço inativo", 25m, active: false));
            await dbContext.SaveChangesAsync();
        }

        using var response = await client.GetAsync($"/api/v1/services/{id}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
