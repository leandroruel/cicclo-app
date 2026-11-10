using Cicclo.Domain.Wallets;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cicclo.Infrastructure.Persistence.Configurations;

public sealed class WalletConfiguration : IEntityTypeConfiguration<Wallet>
{
    public void Configure(EntityTypeBuilder<Wallet> builder)
    {
        builder.ToTable("Wallets");
        builder.HasKey(wallet => wallet.Id);
        builder.Property(wallet => wallet.Balance)
            .HasPrecision(18, 2)
            .IsRequired();
        builder.Property(wallet => wallet.Version)
            .IsConcurrencyToken()
            .IsRequired();
    }
}
