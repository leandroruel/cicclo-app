namespace Cicclo.Api.Contracts;

/// <summary>Serviço ativo disponível para contratação.</summary>
public sealed record ServiceResponse(int Id, string Name, decimal Price, string Currency);
