import { writable } from 'svelte/store';

export interface ComponentData {
    id: string;
    type: string;
    props: Record<string, any>;
    styles: {
        desktop: Record<string, string>;
        tablet: Record<string, string>;
        mobile: Record<string, string>;
    };
}

export interface AppState {
    components: ComponentData[];
    selectedComponentId: string | null;
}

const initialState: AppState = {
    components: [
        {
            id: 'hero-1',
            type: 'Hero',
            props: { title: 'Welcome to your App' },
            styles: {
                desktop: { padding: '80px', fontSize: '3rem' },
                tablet: { padding: '60px', fontSize: '2.5rem' },
                mobile: { padding: '40px', fontSize: '2rem' }
            }
        }
    ],
    selectedComponentId: null
};

export const appStore = writable<AppState>(initialState);

export function addComponent(type: string) {
    const newComponent: ComponentData = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        props: {},
        styles: {
            desktop: {},
            tablet: {},
            mobile: {}
        }
    };

    appStore.update(state => ({
        ...state,
        components: [...state.components, newComponent]
    }));
}

export function updateComponentStyle(id: string, breakpoint: 'desktop' | 'tablet' | 'mobile', styles: Record<string, string>) {
    appStore.update(state => ({
        ...state,
        components: state.components.map(c =>
            c.id === id
                ? { ...c, styles: { ...c.styles, [breakpoint]: { ...c.styles[breakpoint], ...styles } } }
                : c
        )
    }));
}
