FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY global.json Directory.Build.props Directory.Packages.props ./
COPY src/Cicclo.Api/Cicclo.Api.csproj src/Cicclo.Api/
COPY src/Cicclo.Application/Cicclo.Application.csproj src/Cicclo.Application/
COPY src/Cicclo.Domain/Cicclo.Domain.csproj src/Cicclo.Domain/
COPY src/Cicclo.Infrastructure/Cicclo.Infrastructure.csproj src/Cicclo.Infrastructure/
RUN dotnet restore src/Cicclo.Api/Cicclo.Api.csproj

COPY src/ src/
RUN dotnet publish src/Cicclo.Api/Cicclo.Api.csproj \
    --configuration Release \
    --output /app/publish \
    --no-restore \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

RUN mkdir /data && chown app:app /data
USER app

ENV ASPNETCORE_HTTP_PORTS=8080
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ConnectionStrings__Default="Data Source=/data/cicclo.db"

EXPOSE 8080
VOLUME ["/data"]

ENTRYPOINT ["dotnet", "Cicclo.Api.dll"]
