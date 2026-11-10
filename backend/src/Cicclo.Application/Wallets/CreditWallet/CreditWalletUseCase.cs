using Cicclo.Application.Abstractions;

namespace Cicclo.Application.Wallets.CreditWallet;

public sealed class CreditWalletUseCase(IWalletRepository walletRepository)
{
    public Task<WalletCreditResult> ExecuteAsync(
        decimal amount,
        string idempotencyKey,
        CancellationToken cancellationToken) =>
        walletRepository.CreditAsync(amount, idempotencyKey, cancellationToken);
}
