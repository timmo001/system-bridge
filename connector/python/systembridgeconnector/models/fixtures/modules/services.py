"""Test fixtures for the services module."""

from systembridgeconnector.models.modules.services import (
    ServiceAction,
    ServiceBusy,
    ServiceError,
    ServiceHealth,
    ServiceItem,
    ServiceList,
    ServiceListItem,
    ServiceProvider,
    Services,
    ServiceStat,
    ServiceStatKind,
)

FIXTURE_SERVICES = Services(
    providers=[
        ServiceProvider(id="dot", updated=1763600000000),
        ServiceProvider(
            id="backups",
            updated=1763590000000,
            error="exited with code 1: repository locked",
        ),
    ],
    items=[
        ServiceItem(
            provider="dot",
            id="kopia-offsite",
            label="Off-site backup",
            kind="timer",
            health=ServiceHealth.RUNNING,
            busy=True,
            summary="Uploading to B2",
            last_run=1763599500000,
            last_success=1763513100000,
            next_run=1763685900000,
            progress=0.4,
            stats=[
                ServiceStat(
                    id="r2_used",
                    label="R2 used",
                    value=7.1,
                    unit="GB",
                    kind=ServiceStatKind.SIZE,
                ),
                ServiceStat(id="state", label="State", value="uploading"),
            ],
            notes=["B2 is capped at the free 10 GB"],
            lists=[
                ServiceList(
                    id="sources",
                    label="Sources",
                    items=[ServiceListItem(label="Photos", value="02:27")],
                )
            ],
            actions=[
                ServiceAction(id="start", label="Run now"),
                ServiceAction(
                    id="verify",
                    label="Verify",
                    confirm="Read back 10% of the files?",
                    disabled="Runs after the upload",
                ),
            ],
        ),
        ServiceItem(
            provider="backups",
            id="snapshots",
            label="Snapshots",
            kind="check",
            health=ServiceHealth.STALE,
            summary="Newest snapshot 3 hours ago",
        ),
    ],
    busy=[
        ServiceBusy(
            provider="dot",
            item="kopia-offsite",
            label="Off-site backup",
            since=1763599500000,
        )
    ],
    errors=[
        ServiceError(
            provider="dot",
            source="services.d/foo.yml",
            message="Unknown key busyy",
        )
    ],
)
