using Cicclo.Domain.Wallets;
using Cicclo.Application.Wallets.CreditWallet;

namespace Cicclo.Application.Abstractions;

public interface IWalletRepository
{
    Task<Wallet?> GetDefaultAsync(CancellationToken cancellationToken);

    Task<WalletCreditResult> CreditAsync(
        decimal amount,
        string idempotencyKey,
        CancellationToken cancellationToken);
}
