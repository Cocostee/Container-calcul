import { useTranslation } from "../i18n";
import type { ContainerType } from "../types/container.types";
import type { PaletteType } from "../types/palette.types";
import type { SizeAdvice } from "../types/placement.types";
import type { ContainerDraft } from "../types/project.types";
import { ContainerSizeFields } from "./ContainerSizeFields";
import { Button } from "./ui/Button/Button";
import { Icon } from "./ui/Icon";

interface ContainerListProps {
  containers: ContainerDraft[];
  containerTypes: ContainerType[];
  palletTypes: PaletteType[];
  advice: SizeAdvice | null;
  onAdd: () => void;
  onRemove: (clientId: string) => void;
  onChange: (clientId: string, patch: Partial<ContainerDraft>) => void;
  onCustomDimChange: (
    clientId: string,
    field: "length_cm" | "width_cm" | "height_cm" | "max_weight_kg",
    value: number,
  ) => void;
}

/**
 * Les conteneurs de l'expédition. Chacun porte sa taille et son format de
 * palette, et se remplit dans l'ordre : le premier se sert, le suivant reprend
 * ce qui reste. Le badge signale le format qui demanderait le moins de
 * conteneurs pour le lot complet.
 */
export function ContainerList({
  containers,
  containerTypes,
  palletTypes,
  advice,
  onAdd,
  onRemove,
  onChange,
  onCustomDimChange,
}: ContainerListProps) {
  const { t } = useTranslation();

  return (
    <div className="container-list">
      {containers.length === 0 ? (
        <p className="muted">
          <Icon name="info-circle-outline" size="sm" tone="accent" />
          {t("containers.empty")}
        </p>
      ) : null}

      <ol className="container-list__items">
        {containers.map((draft, index) => (
          <li key={draft.clientId} className="container-card">
            <div className="container-card__head">
              <span className="container-card__rank" aria-hidden="true">
                {index + 1}
              </span>
              <Icon
                name="container-outline"
                size="lg"
                tone="primary"
                className="container-card__glyph"
              />
              <div>
                <h3>{t("containers.itemTitle", { position: index + 1 })}</h3>
                <p className="muted">
                  {index === 0
                    ? t("containers.firstLoaded")
                    : t("containers.thenLoaded")}
                </p>
              </div>
              <Button
                variant="ghost"
                className="container-card__remove"
                aria-label={t("containers.remove", { position: index + 1 })}
                onClick={() => onRemove(draft.clientId)}
              >
                <Icon name="trash-outline" size="sm" />
              </Button>
            </div>

            <ContainerSizeFields
              draft={draft}
              containerTypes={containerTypes}
              palletTypes={palletTypes}
              advice={advice}
              onChange={onChange}
              onCustomDimChange={onCustomDimChange}
            />
          </li>
        ))}
      </ol>

      <Button
        variant="secondary"
        icon="plus-outline"
        className="container-list__add"
        onClick={onAdd}
      >
        {t("containers.add")}
      </Button>
    </div>
  );
}
