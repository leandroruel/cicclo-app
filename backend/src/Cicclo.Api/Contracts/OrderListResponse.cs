namespace Cicclo.Api.Contracts;

/// <summary>Histórico de pedidos, do mais recente para o mais antigo.</summary>
public sealed record OrderListResponse(IReadOnlyList<OrderListItemResponse> Items);
