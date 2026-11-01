# Fusion Mirrors service

The static website builds the explorer page, scoped CSS, and JavaScript.
This WSGI service provides material metadata, raster plots, calculation
settings, method references, and individual wavelength queries.

The full catalog and spectrum arrays stay in a private package outside
both the public web root and the application directory. Nothing copies
that package into the website build or repository.

## Endpoints

| Route | Response |
| --- | --- |
| `GET /fusion-mirrors/api/materials` | Material identifiers, families, PAW branches, method references |
| `GET /fusion-mirrors/api/provenance` | Selected calculation settings and references |
| `GET /fusion-mirrors/api/plot` | PNG containing reflectivity, n, and k, or reflectivity alone |
| `POST /fusion-mirrors/api/probe` | One wavelength sample per selected PAW branch |

The service has no spectrum-array, raw-file, archive, CSV, or batch route.
The default view shows three aligned plots: reflectivity, refractive index,
and extinction coefficient. Up to three materials can share each set of
axes, using one common PAW branch and response channel. Alternatively,
one material can compare its two PAW datasets. Colors and line patterns
identify series; UV, visible and near-infrared backgrounds use distinct
shading. The public catalog supplies only plot geometry and band bounds
for the wavelength guide, with no optical curve coordinates.

Pointer movement and keyboard arrows update a local wavelength guide.
Clicking, tapping or pressing Enter requests one wavelength, with at most
three material results or two PAW results. Each such request consumes one
of the existing 40 daily numerical-query allowances. Guide movement sends
no numerical requests. Shared links retain comparison selections. Internal
structure identifiers remain in the private source catalog and are omitted
from public calculation settings.

Queries use the nearest stored 1 nm screening sample within the selected
band. Responses report its wavelength and offset and round optical values
to four significant digits. Invalid samples remain missing. Both PAW
branches use PBE. The n/k view uses normal-z mode 1, while reflectivity uses
the full tensor with Cartesian z as the surface normal.

## Configuration

Install `app/requirements.txt` in a service-specific environment. The WSGI
entry point is `wsgi:application`, with `app/` as its working directory.
`gunicorn.conf.py` binds to loopback with two workers.

| Variable | Purpose |
| --- | --- |
| `MIRROR_DATA_ROOT` | Private directory containing `data/catalog.json` |
| `MIRROR_QUOTA_DB` | Persistent writable SQLite file outside the public web root |
| `MIRROR_PUBLIC_ORIGIN` | Exact HTTPS origin accepted for wavelength queries |
| `MIRROR_WEB_ROOT` | Actual public directory; startup rejects data located within it |
| `MIRROR_TRUST_PROXY` | Enable only for a loopback proxy that replaces `X-Real-IP` |
| `MIRROR_PLOTS_PER_DAY` | Per-address daily plot quota, default 120 |
| `MIRROR_PROBES_PER_DAY` | Per-address daily wavelength-query quota, default 40 |
| `MIRROR_REQUESTS_PER_DAY` | Global daily request quota, default 2400 |

There is also a per-address limit of 1,200 requests per day. SQLite
transactions enforce quotas across workers. Counters expire at UTC
midnight. Shared client addresses share allowances. Raster plots remain
copyable, and distributed clients can evade address-based quotas.

## Website integration

Proxy only `/fusion-mirrors/api/` to the loopback service, retaining the
full URL prefix. Keep the normal website route and shared page template.
The reverse proxy must replace `X-Real-IP` with the visitor address before
trusted-proxy mode is enabled. The existing usage-event endpoint receives
view choices and requested wavelengths, without numerical results or
source paths. Local previews send no usage events.

Keep the tools entry hidden until the private package is verified, the
service is installed, and public requests pass the endpoint and file-access
checks. The regular static website build does not start a WSGI service.
Deploying static files alone leaves the API unavailable.

## Validation

The service tests cover exact values, missing samples, blocked batches,
file containment, sanitized settings, origin checks, persistent quotas,
concurrency, daily reset, and web-root containment. The website browser
check supplies synthetic fixtures through the same API and checks the
shared shell, wavelength lookup, PAW comparison, invalid samples, and
mobile layout. Keep test outputs in ignored `review-output/` directories.
