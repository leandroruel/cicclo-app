using Cicclo.Api.Contracts;
using Cicclo.Application.Services.GetServices;
using Microsoft.AspNetCore.Mvc;

namespace Cicclo.Api.Controllers;

[ApiController]
[Route("api/v1/services")]
public sealed class ServicesController(GetServicesUseCase getServices) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("Lista os serviços ativos.")]
    [EndpointDescription("Retorna os serviços ativos em ordem crescente de identificador.")]
    [ProducesResponseType<ServiceListResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ServiceListResponse>> Get(CancellationToken cancellationToken)
    {
        var services = await getServices.ExecuteAsync(cancellationToken);
        return Ok(new ServiceListResponse(
            services.Select(service =>
                new ServiceResponse(service.Id, service.Name, service.Price, "BRL"))
                .ToArray()));
    }

    [HttpGet("{id:int}")]
    [EndpointSummary("Busca um serviço ativo por ID.")]
    [EndpointDescription("Retorna os detalhes do serviço ativo correspondente ao identificador.")]
    [ProducesResponseType<ServiceResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ServiceResponse>> GetById(
        int id,
        CancellationToken cancellationToken)
    {
        var service = await getServices.ExecuteAsync(id, cancellationToken);
        return service is null
            ? NotFound(new ProblemDetails
            {
                Type = "https://cicclo.app/errors/service-not-found",
                Status = StatusCodes.Status404NotFound,
                Title = "Serviço não encontrado",
                Detail = "O serviço não existe ou está inativo.",
                Instance = HttpContext.Request.Path
            })
            : Ok(new ServiceResponse(service.Id, service.Name, service.Price, "BRL"));
    }
}
