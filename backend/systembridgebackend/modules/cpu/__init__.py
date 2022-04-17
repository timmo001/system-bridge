"""System Bridge: CPU"""
from psutil import (
    cpu_count,
    cpu_freq,
    cpu_percent,
    cpu_stats,
    cpu_times_percent,
    cpu_times,
)
from psutil._common import scpufreq, scpustats, pcputimes

from systembridgebackend.base import Base


class CPU(Base):
    """CPU: Get CPU usage"""

    def count(self) -> int:
        """CPU count"""
        return cpu_count()

    def freq(self) -> scpufreq:
        """CPU frequency"""
        return cpu_freq()

    def freq_per_cpu(self) -> list[scpufreq]:
        """CPU frequency per CPU"""
        return cpu_freq(percpu=True)

    def stats(self) -> scpustats:
        """CPU stats"""
        return cpu_stats()

    def freq_per_cpu(self) -> list[scpufreq]:
        """CPU frequency per CPU"""
        return cpu_freq(percpu=True)

    def times(self) -> pcputimes:
        """CPU times"""
        return cpu_times(percpu=False)

    def times_percent(self) -> pcputimes:
        """CPU times percent"""
        return cpu_times_percent(interval=1, percpu=False)

    def times_per_cpu(self) -> list[pcputimes]:
        """CPU times per CPU"""
        return cpu_times(percpu=True)

    def times_per_cpu_percent(self) -> list[pcputimes]:
        """CPU times per CPU percent"""
        return cpu_times_percent(interval=1, percpu=True)

    def usage(self) -> float:
        """CPU usage"""
        return cpu_percent(interval=1, percpu=False)

    def usage_per_cpu(self) -> list[float]:
        """CPU usage per CPU"""
        return cpu_percent(interval=1, percpu=True)
