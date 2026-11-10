using Cicclo.Application.Abstractions;
using Cicclo.Infrastructure.Persistence;
using Cicclo.Infrastructure.Persistence.Repositories;
using Cicclo.Infrastructure.Persistence.Seed;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Cicclo.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("A connection string named 'Default' is required.");

        services.AddDbContext<AppDbContext>(options => options.UseSqlite(connectionString));
        services.AddScoped<IWalletRepository, WalletRepository>();
        services.AddScoped<IOrderRepository, OrderRepository>();

        return services;
    }

    public static async Task InitializeDatabaseAsync(
        this IServiceProvider serviceProvider,
        CancellationToken cancellationToken = default)
    {
        await using var scope = serviceProvider.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await dbContext.Database.MigrateAsync(cancellationToken);
        await DbSeeder.SeedAsync(dbContext, cancellationToken);
    }
}
