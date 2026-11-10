using Cicclo.Domain.Services;
using Cicclo.Domain.Wallets;
using Microsoft.EntityFrameworkCore;

namespace Cicclo.Infrastructure.Persistence.Seed;

public static class DbSeeder
{
    private static readonly Guid DefaultWalletId = Guid.Parse("5b1f0c1e-7a34-4c53-9c0e-2f6f4a1d9a10");

    public static async Task SeedAsync(AppDbContext dbContext, CancellationToken cancellationToken)
    {
        if (!await dbContext.Wallets.AnyAsync(cancellationToken))
        {
            dbContext.Wallets.Add(new Wallet(DefaultWalletId, 50.00m));
        }

        if (!await dbContext.Services.AnyAsync(cancellationToken))
        {
            dbContext.Services.AddRange(
                new LaundryService(1, "Lavagem", 18.90m, active: true),
                new LaundryService(2, "Secagem", 20.90m, active: true));
        }

        if (dbContext.ChangeTracker.HasChanges())
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }
}
