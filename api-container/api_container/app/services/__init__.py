"""Application services - business logic and orchestration.

Services hold the application rules and orchestrate repositories and the
packing algorithm. They never touch FastAPI request/response objects and never
issue raw SQL directly (that belongs to ``app/repositories``).
"""
