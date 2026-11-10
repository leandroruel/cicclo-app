using Cicclo.Application.Wallets.GetWallet;
using Cicclo.Application.Wallets.CreditWallet;
using Cicclo.Application.Orders.CreateOrder;
using Cicclo.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().ConfigureApiBehaviorOptions(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var problem = new ValidationProblemDetails(context.ModelState)
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "A requisição contém dados inválidos.",
            Instance = context.HttpContext.Request.Path
        };
        problem.Extensions["code"] = "validation_error";
        return new BadRequestObjectResult(problem);
    };
});
builder.Services.AddOpenApi();
builder.Services.AddScoped<GetWalletUseCase>();
builder.Services.AddScoped<CreditWalletUseCase>();
builder.Services.AddScoped<CreateOrderUseCase>();
builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

await app.Services.InitializeDatabaseAsync();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.MapControllers();

app.Run();

public partial class Program
{
}
