namespace Cicclo.Api.Contracts;

/// <summary>Pedido registrado, com preço e nome do serviço no momento da compra.</summary>
public sealed record OrderListItemResponse(
    Guid Id,
    int ServiceId,
    string ServiceName,
    decimal Price,
    string Currency,
    string Status,
    DateTimeOffset CreatedAt);
