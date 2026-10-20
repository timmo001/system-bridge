Moves the forecast below the current conditions so the card keeps its height when the forecast is hidden.

Fixes #123

| Before | After |
| --- | --- |
| ![Forecast above the current conditions](./before.png) | ![Forecast below the current conditions](./after.png) |

<details>
<summary>Previous changes</summary>

| Forecast hidden | Forecast shown |
| --- | --- |
| ![First pass with the forecast hidden](./first-hidden.png) | ![First pass with the forecast shown](./first-shown.png) |

</details>

Several views, one table per pair, with the URL after each caption:

| Integration page link (`/config/devices/dashboard?domain=wled`) | Area page link (`/config/devices/dashboard?area=kitchen`) |
| --- | --- |
| ![Devices filtered to WLED](./integration-link.png) | ![Devices filtered to the kitchen](./area-link.png) |

| Grouped by manufacturer (`/config/devices/dashboard?group=manufacturer`) | The same with a search (`/config/devices/dashboard?group=manufacturer&search=light`) |
| --- | --- |
| ![Devices grouped by manufacturer](./group.png) | ![Grouped devices matching light](./search.png) |
