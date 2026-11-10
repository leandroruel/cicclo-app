using Cicclo.Application.Abstractions;

namespace Cicclo.Application.Services.GetServices;

public sealed class GetServicesUseCase(IServiceRepository serviceRepository)
{
    public async Task<IReadOnlyList<ServiceResult>> ExecuteAsync(CancellationToken cancellationToken)
    {
        var services = await serviceRepository.GetActiveAsync(cancellationToken);
        return services
            .Select(service => new ServiceResult(service.Id, service.Name, service.Price))
            .ToArray();
    }

    public async Task<ServiceResult?> ExecuteAsync(int id, CancellationToken cancellationToken)
    {
        var service = await serviceRepository.GetActiveByIdAsync(id, cancellationToken);
        return service is null
            ? null
            : new ServiceResult(service.Id, service.Name, service.Price);
    }
}
