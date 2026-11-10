using System.ComponentModel.DataAnnotations;

namespace Cicclo.Api.Contracts;

/// <summary>Solicitação para executar um serviço da lavanderia.</summary>
public sealed record CreateOrderRequest
{
    /// <summary>Identificador do serviço que será solicitado.</summary>
    [Range(1, int.MaxValue)]
    public required int ServiceId { get; init; }
}
