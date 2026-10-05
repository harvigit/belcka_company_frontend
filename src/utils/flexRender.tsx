import React from 'react';
import {flexRender as tanstackFlexRender, type Renderable} from '@tanstack/react-table';

/**
 * Drop-in replacement for TanStack's `flexRender`.
 *
 * TanStack renders a function cell/header as `<Comp {...props} />`. Most tables
 * here rebuild their `columns` array on every render (e.g. on row hover), so each
 * render passes a brand new function identity and React unmounts/remounts the
 * whole cell. That re-creates every <Avatar>/<img>, which re-requests the image
 * (and floods the network with 404s for missing images).
 *
 * Here function renderers go through one stable component, so React keeps the
 * existing cell DOM and only re-renders it.
 */
type RenderFn = (props: any) => React.ReactNode;

const StableFlexCell = ({__render, __props}: {__render: RenderFn; __props: any}) => (
    <>{__render(__props)}</>
);

const isClassComponent = (comp: unknown): boolean =>
    typeof comp === 'function' && !!(comp as any).prototype?.isReactComponent;

export function flexRender<TProps extends object>(
    Comp: Renderable<TProps>,
    props: TProps,
): React.ReactNode | React.JSX.Element {
    if (typeof Comp === 'function' && !isClassComponent(Comp)) {
        return <StableFlexCell __render={Comp as RenderFn} __props={props}/>;
    }

    return tanstackFlexRender(Comp, props);
}
