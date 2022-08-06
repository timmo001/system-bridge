"""System Bridge: Server"""

from fastapi import Body, Depends, FastAPI, HTTPException, Security, status
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.models import APIKey
from fastapi.openapi.utils import get_openapi
from fastapi.security.api_key import APIKeyCookie, APIKeyHeader, APIKeyQuery
from starlette.responses import JSONResponse, RedirectResponse
from starlette.status import (
    HTTP_400_BAD_REQUEST,
    HTTP_401_UNAUTHORIZED,
    HTTP_404_NOT_FOUND,
)
from systembridgeshared.common import convert_string_to_correct_type
from systembridgeshared.const import HEADER_API_KEY, QUERY_API_KEY, SECRET_API_KEY
from systembridgeshared.database import TABLE_MAP, Database
from systembridgeshared.settings import Settings

from ..modules.system import System

database = Database()
settings = Settings(database)

api_key_query = APIKeyQuery(name=QUERY_API_KEY, auto_error=False)
api_key_header = APIKeyHeader(name=HEADER_API_KEY, auto_error=False)
api_key_cookie = APIKeyCookie(name=HEADER_API_KEY, auto_error=False)

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)


async def auth_api_key(
    api_key_query: str = Security(api_key_query),
    api_key_header: str = Security(api_key_header),
    api_key_cookie: str = Security(api_key_cookie),
):
    """Get API Key"""
    api_key = settings.get_secret(SECRET_API_KEY)
    if api_key_query == api_key:
        return api_key_query
    if api_key_header == api_key:
        return api_key_header
    if api_key_cookie == api_key:
        return api_key_cookie
    raise HTTPException(
        status_code=HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )


@app.get(
    "/logout",
    tags=["authentication"],
)
async def get_logout():
    """Logout and remove cookie"""
    response = RedirectResponse(url="/")
    response.delete_cookie(
        HEADER_API_KEY,
        domain="localhost",
    )
    return response


@app.get(
    "/",
    tags=["root"],
)
async def get_root() -> dict:
    """GET root"""
    return {
        "message": "The API server is running!",
    }


@app.get(
    "/docs",
    tags=["documentation"],
    dependencies=[Depends(auth_api_key)],
)
async def get_documentation(api_key: APIKey = Depends(auth_api_key)):
    """GET documentation"""
    response = get_swagger_ui_html(
        title="System Bridge",
        openapi_url="/docs/json",
    )
    response.set_cookie(
        HEADER_API_KEY,
        value=api_key,  # type: ignore
        domain="localhost",
        httponly=True,
        max_age=1800,
        expires=1800,
    )
    return response


@app.get(
    "/docs/json",
    tags=["documentation"],
    dependencies=[Depends(auth_api_key)],
)
async def get_open_api_endpoint():
    """GET OpenAPI"""
    response = JSONResponse(
        get_openapi(
            title="System Bridge",
            version=System().version(),
            routes=app.routes,
        )
    )
    return response


@app.get(
    "/api",
    tags=["api"],
    dependencies=[Depends(auth_api_key)],
)
async def get_api() -> dict:
    """GET API"""
    return {
        "message": "The API server is running!",
        "version": System().version(),
    }


@app.get(
    "/api/data/{module}",
    tags=["api"],
    dependencies=[Depends(auth_api_key)],
)
async def get_data(module: str) -> dict:
    """GET data"""
    table_module = TABLE_MAP.get(module)
    if table_module is None:
        raise HTTPException(
            status_code=HTTP_404_NOT_FOUND,
            detail=f"Data module {module} not found",
        )
    return database.get_data_dict(table_module).dict()


@app.get(
    "/api/data/{module}/{key}",
    tags=["api"],
    dependencies=[Depends(auth_api_key)],
)
async def get_data_by_key(
    module: str,
    key: str,
) -> dict:
    """GET data"""
    table_module = TABLE_MAP.get(module)
    if table_module is None:
        raise HTTPException(
            status_code=HTTP_404_NOT_FOUND,
            detail=f"Data module {module} not found",
        )

    data = database.get_data_item_by_key(table_module, key)
    if data is None:
        raise HTTPException(
            status_code=HTTP_404_NOT_FOUND,
            detail=f"Data item {key} not found",
        )

    return {
        data.key: convert_string_to_correct_type(data.value),
        "last_updated": data.timestamp,
    }
