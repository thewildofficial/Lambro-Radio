# ShadCN Components Used in Lambro Radio Frontend

This file tracks the ShadCN UI components that have been integrated into the Lambro Radio project.

## Core UI & Layout

*   `Card`, `CardContent`: Used for structuring content sections, like the player itself.
    *   Installed: Yes (implied by usage in `PlayerSection.tsx`)
*   `Button`: Standard button component, used for player controls, theme switching, etc.
    *   Installed: Yes (implied by usage)
*   `Slider`: Used for volume control.
    *   Installed: Yes (implied by usage)
*   `Switch`: Used for toggles (e.g., AI preset - though this might be evolving).
    *   Installed: Yes (implied by usage)
*   `Label`: Used for associating text with form elements/controls.
    *   Installed: Yes (implied by usage)
*   `Input`: (Was previously used, might be re-introduced or used elsewhere).
    *   Installed: Likely (worth verifying if new input fields are added)
*   `Carousel`, `CarouselContent`, `CarouselItem`, `CarouselNext`, `CarouselPrevious`: Used for the frequency preset selection.
    *   Installed: Yes (implied by usage)

## Custom/Extended Components

*   `CircularFrequencyDial`: This appears to be a custom component, possibly built using ShadCN primitives or inspired by its style, but not a direct ShadCN component. It's located in `@/components/ui/CircularFrequencyDial`.

## Icons

*   While not ShadCN components themselves, `lucide-react` icons are used extensively alongside ShadCN components, which is a common practice.

## Future Considerations / To Be Verified

*   `Dialog` / `AlertDialog`: For modals like sharing or settings (e.g. `ShareDialog.tsx` exists).
*   `Tooltip`: For providing extra information on hover for controls.
*   `Sheet`: For side panels (e.g., for settings or playlist).
*   `Select`: If dropdowns are needed beyond the carousel for presets.

This list should be updated as new components are added or existing ones are confirmed. 