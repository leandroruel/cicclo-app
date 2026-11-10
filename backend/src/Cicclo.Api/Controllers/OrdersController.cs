using Cicclo.Api.Contracts;
using Cicclo.Application.Orders.CreateOrder;
using Microsoft.AspNetCore.Mvc;

namespace Cicclo.Api.Controllers;

[ApiController]
[Route("api/v1/orders")]
public sealed class OrdersController(CreateOrderUseCase createOrder) : ControllerBase
{
    [HttpPost]
    [ProducesResponseType<OrderResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<OrderResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<OrderResponse>> Create(
        [FromBody] CreateOrderRequest request,
        [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(idempotencyKey, out var parsedKey))
        {
            return BadRequest(CreateProblem(
                StatusCodes.Status400BadRequest,
                "missing_idempotency_key",
                "O cabeçalho Idempotency-Key deve conter um UUID válido."));
        }

        var result = await createOrder.ExecuteAsync(
            request.ServiceId,
            parsedKey,
            cancellationToken);

        switch (result.Status)
        {
            case CreateOrderStatus.ServiceNotFound:
                return NotFound(CreateProblem(
                    StatusCodes.Status404NotFound,
                    "service_not_found",
                    "O serviço não existe ou está inativo."));
            case CreateOrderStatus.InsufficientBalance:
                return UnprocessableEntity(CreateProblem(
                    StatusCodes.Status422UnprocessableEntity,
                    "insufficient_balance",
                    "O saldo da carteira não cobre o valor do serviço.",
                    ("balance", result.WalletBalance),
                    ("required", result.Required)));
            case CreateOrderStatus.IdempotencyKeyMismatch:
                return UnprocessableEntity(CreateProblem(
                    StatusCodes.Status422UnprocessableEntity,
                    "idempotency_key_mismatch",
                    "A chave de idempotência já foi usada com outro serviço."));
            case CreateOrderStatus.WalletConflict:
                return Conflict(CreateProblem(
                    StatusCodes.Status409Conflict,
                    "wallet_conflict",
                    "A carteira foi atualizada por outra operação. Tente novamente com a mesma chave."));
        }

        var response = ToResponse(result);
        if (result.Status == CreateOrderStatus.Replayed)
        {
            Response.Headers["Idempotent-Replayed"] = "true";
            return Ok(response);
        }

        return CreatedAtAction(nameof(GetById), new { id = result.Id }, response);
    }

    [HttpGet("{id:guid}", Name = nameof(GetById))]
    [ProducesResponseType<OrderResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrderResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var order = await createOrder.GetByIdAsync(id, cancellationToken);
        return order is null
            ? NotFound(CreateProblem(
                StatusCodes.Status404NotFound,
                "order_not_found",
                "O pedido não foi encontrado."))
            : Ok(ToResponse(order));
    }

    private ProblemDetails CreateProblem(
        int status,
        string code,
        string detail,
        params (string Name, object? Value)[] extensions)
    {
        var problem = new ProblemDetails
        {
            Type = $"https://cicclo.app/errors/{code.Replace('_', '-')}",
            Status = status,
            Title = code switch
            {
                "insufficient_balance" => "Saldo insuficiente",
                "wallet_conflict" => "Conflito na carteira",
                _ => status == StatusCodes.Status404NotFound
                    ? "Recurso não encontrado"
                    : status == StatusCodes.Status409Conflict ? "Conflito" : "Requisição inválida"
            },
            Detail = detail,
            Instance = HttpContext.Request.Path
        };
        problem.Extensions["code"] = code;
        foreach (var (name, value) in extensions)
        {
            if (value is not null)
            {
                problem.Extensions[name] = value;
            }
        }

        return problem;
    }

    private static OrderResponse ToResponse(CreateOrderResult result) =>
        new(
            result.Id!.Value,
            result.ServiceId!.Value,
            result.ServiceName!,
            result.Price!.Value,
            "BRL",
            result.OrderStatus!,
            result.CreatedAt!.Value,
            result.WalletBalance!.Value);
}
