export {};

// 1. Import when extension is user-scoped
import '../../../../public/global';
// 2. Import when extension is server-scoped
import '../../../../global';

declare global {
    // Extension-specific type declarations
    // Note: SillyTavern global types (including jQuery) are already imported above
}
