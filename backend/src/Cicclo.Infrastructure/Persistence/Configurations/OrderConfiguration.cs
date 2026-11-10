using Cicclo.Domain.Orders;
using Cicclo.Domain.Services;
using Cicclo.Domain.Wallets;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cicclo.Infrastructure.Persistence.Configurations;

public sealed class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("Orders");
        builder.HasKey(order => order.Id);
        builder.Property(order => order.ServiceNameAtPurchase)
            .HasMaxLength(100)
            .IsRequired();
        builder.Property(order => order.PriceAtPurchase)
            .HasPrecision(18, 2)
            .IsRequired();
        builder.Property(order => order.Status)
            .HasConversion<string>()
            .HasMaxLength(32)
            .IsRequired();
        builder.Property(order => order.CreatedAt)
            .IsRequired();
        builder.HasIndex(order => order.IdempotencyKey)
            .IsUnique();
        builder.HasOne<Wallet>()
            .WithMany()
            .HasForeignKey(order => order.WalletId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<LaundryService>()
            .WithMany()
            .HasForeignKey(order => order.ServiceId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
