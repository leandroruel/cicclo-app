using Cicclo.Application.Abstractions;

namespace Cicclo.Application.Wallets.GetWallet;

public sealed class GetWalletUseCase(IWalletRepository walletRepository)
{
    public async Task<WalletResult?> ExecuteAsync(CancellationToken cancellationToken)
    {
        var wallet = await walletRepository.GetDefaultAsync(cancellationToken);

        return wallet is null ? null : new WalletResult(wallet.Id, wallet.Balance);
    }
}
