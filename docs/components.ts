import HeaderSearch from "@timmo001/docs-kit/blume/header-search.astro";
import HomeBanner from "@timmo001/docs-kit/blume/home-banner.astro";
import { defineComponents } from "blume";

export default defineComponents({
  layout: {
    PageHeader: HomeBanner,
    Search: HeaderSearch,
  },
});
