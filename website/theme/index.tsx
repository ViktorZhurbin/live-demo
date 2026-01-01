import {
  HomeLayout as BasicHomeLayout,
  PackageManagerTabs,
} from "@rspress/core/theme-original";
import { HomeDemo } from "../components/HomeDemo";

function HomeLayout() {
  return (
    <BasicHomeLayout
      afterHeroActions={
        <>
          <div style={{ width: "100%", textAlign: "left" }}>
            <HomeDemo />
          </div>

          <div style={{ width: "100%", maxWidth: 450, margin: "-1rem 0" }}>
            <PackageManagerTabs command="install @live-demo/rspress -D" />
          </div>

          <a
            href="./guide/getStarted"
            className="rp-button rp-button--brand rp-button--big rp-home-hero__action rp-link"
          >
            Get started
          </a>
        </>
      }
    />
  );
}

export * from "@rspress/core/theme-original";
export { HomeLayout };
