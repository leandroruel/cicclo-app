using Cicclo.Application.Abstractions;
using Cicclo.Application.Wallets.CreditWallet;
using Cicclo.Domain.Wallets;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace Cicclo.Infrastructure.Persistence.Repositories;

public sealed class WalletRepository(AppDbContext dbContext) : IWalletRepository
{
    public Task<Wallet?> GetDefaultAsync(CancellationToken cancellationToken) =>
        dbContext.Wallets.SingleOrDefaultAsync(cancellationToken);

    public async Task<WalletCreditResult> CreditAsync(
        decimal amount,
        string idempotencyKey,
        CancellationToken cancellationToken)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        var existingCredit = await dbContext.WalletCredits
            .AsNoTracking()
            .SingleOrDefaultAsync(
                credit => credit.IdempotencyKey == idempotencyKey,
                cancellationToken);

        if (existingCredit is not null)
        {
            var status = existingCredit.Amount == amount
                ? WalletCreditStatus.AlreadyApplied
                : WalletCreditStatus.IdempotencyKeyConflict;

            await transaction.CommitAsync(cancellationToken);
            return new WalletCreditResult(status, existingCredit.WalletId, existingCredit.BalanceAfter);
        }

        var wallet = await dbContext.Wallets.SingleOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException("A carteira padrão não foi encontrada.");

        wallet.Credit(amount);
        dbContext.WalletCredits.Add(new WalletCredit(wallet.Id, idempotencyKey, amount, wallet.Balance));

        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return new WalletCreditResult(WalletCreditStatus.Applied, wallet.Id, wallet.Balance);
    }
}
