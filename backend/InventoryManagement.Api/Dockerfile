FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["backend/InventoryManagement.sln", "backend/"]
COPY ["backend/InventoryManagement.Api/InventoryManagement.Api.csproj", "backend/InventoryManagement.Api/"]
COPY ["backend/InventoryManagement.Application/InventoryManagement.Application.csproj", "backend/InventoryManagement.Application/"]
COPY ["backend/InventoryManagement.Domain/InventoryManagement.Domain.csproj", "backend/InventoryManagement.Domain/"]
COPY ["backend/InventoryManagement.Infrastructure/InventoryManagement.Infrastructure.csproj", "backend/InventoryManagement.Infrastructure/"]
RUN dotnet restore "backend/InventoryManagement.Api/InventoryManagement.Api.csproj"
COPY . .
RUN dotnet publish "backend/InventoryManagement.Api/InventoryManagement.Api.csproj" -c Release -o /app/publish --no-restore

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "InventoryManagement.Api.dll"]
