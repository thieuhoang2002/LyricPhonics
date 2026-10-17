# Multi-stage build for .NET 8 Web API
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copy solution and project files first to cache nuget restore
COPY LyricPhonics.sln ./
COPY src/LyricPhonics.Domain/LyricPhonics.Domain.csproj src/LyricPhonics.Domain/
COPY src/LyricPhonics.Application/LyricPhonics.Application.csproj src/LyricPhonics.Application/
COPY src/LyricPhonics.Infrastructure/LyricPhonics.Infrastructure.csproj src/LyricPhonics.Infrastructure/
COPY src/LyricPhonics.Api/LyricPhonics.Api.csproj src/LyricPhonics.Api/
COPY tests/LyricPhonics.Tests/LyricPhonics.Tests.csproj tests/LyricPhonics.Tests/

RUN dotnet restore LyricPhonics.sln

# Copy source and publish
COPY src/ src/
RUN dotnet publish src/LyricPhonics.Api/LyricPhonics.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

# Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:5000
EXPOSE 5000

ENTRYPOINT ["dotnet", "LyricPhonics.Api.dll"]
