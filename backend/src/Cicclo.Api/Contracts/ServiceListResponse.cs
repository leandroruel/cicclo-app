namespace Cicclo.Api.Contracts;

/// <summary>Lista dos serviços ativos disponíveis.</summary>
public sealed record ServiceListResponse(IReadOnlyList<ServiceResponse> Items);
