import errorIcon from "@/assets/error.png";

export default function AdmExplorerPageMissingConfigError() {
  return (
    <section
      aria-labelledby="missing-db-config-error-title"
      aria-describedby="missing-db-config-error-description"
      class="flex flex-col items-center pt-12 pb-32"
    >
      <img
        src={errorIcon}
        alt="Missing database config"
        loading="lazy"
        decoding="async"
        width="512"
        height="512"
        class="w-16 mb-5"
      />
      <h6
        id="missing-db-config-error-title"
        class="font-semibold text-error text-sm mb-2"
      >
        Missing database configuration
      </h6>
      <p
        id="missing-db-config-error-description"
        class="text-xs text-base-content/80 text-center max-w-64"
      >
        The search functionality is not available because the database
        configuration failed to be loaded.
      </p>
    </section>
  );
}
