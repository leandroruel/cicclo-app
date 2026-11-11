using Cicclo.Application.Abstractions;
using Cicclo.Application.Wallets.GetTransactions;
using Microsoft.EntityFrameworkCore;

namespace Cicclo.Infrastructure.Persistence.Repositories;

public sealed class WalletTransactionRepository(AppDbContext dbContext) : IWalletTransactionRepository
{
    public async Task<IReadOnlyList<WalletTransactionResult>> GetDefaultWalletTransactionsAsync(
        CancellationToken cancellationToken)
    {
        var walletId = await dbContext.Wallets
            .Select(wallet => (Guid?)wallet.Id)
            .SingleOrDefaultAsync(cancellationToken);

        if (walletId is null)
        {
            return [];
        }

        var transactions = await (
            from transaction in dbContext.WalletTransactions.AsNoTracking()
            join order in dbContext.Orders.AsNoTracking()
                on transaction.OrderId equals order.Id
            where transaction.WalletId == walletId.Value
            select new WalletTransactionResult(
                transaction.Id,
                transaction.Type,
                transaction.Amount,
                transaction.BalanceAfter,
                transaction.OrderId,
                order.CreatedAt))
            .ToListAsync(cancellationToken);

        return transactions
            .OrderByDescending(transaction => transaction.CreatedAt)
            .ThenBy(transaction => transaction.Id)
            .ToArray();
    }
}
