using Cicclo.Application.Abstractions;
using Cicclo.Domain.Services;
using Microsoft.EntityFrameworkCore;

namespace Cicclo.Infrastructure.Persistence.Repositories;

public sealed class ServiceRepository(AppDbContext dbContext) : IServiceRepository
{
    public async Task<IReadOnlyList<LaundryService>> GetActiveAsync(CancellationToken cancellationToken) =>
        await dbContext.Services
            .AsNoTracking()
            .Where(service => service.Active)
            .OrderBy(service => service.Id)
            .ToListAsync(cancellationToken);

    public Task<LaundryService?> GetActiveByIdAsync(int id, CancellationToken cancellationToken) =>
        dbContext.Services
            .AsNoTracking()
            .SingleOrDefaultAsync(
                service => service.Id == id && service.Active,
                cancellationToken);
}
