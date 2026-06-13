// Minimal stub — full i18n wiring is done in Task 4 (next-intl ES/EN).
// next-intl/plugin requires this file to exist at build time.
import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => ({
  locale: "es",
  messages: {},
}));
