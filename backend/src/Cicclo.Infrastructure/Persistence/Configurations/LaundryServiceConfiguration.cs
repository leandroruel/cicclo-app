using Cicclo.Domain.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cicclo.Infrastructure.Persistence.Configurations;

public sealed class LaundryServiceConfiguration : IEntityTypeConfiguration<LaundryService>
{
    public void Configure(EntityTypeBuilder<LaundryService> builder)
    {
        builder.ToTable("Services");
        builder.HasKey(service => service.Id);
        builder.Property(service => service.Name)
            .HasMaxLength(100)
            .IsRequired();
        builder.Property(service => service.Price)
            .HasPrecision(18, 2)
            .IsRequired();
        builder.Property(service => service.Active)
            .IsRequired();
    }
}
