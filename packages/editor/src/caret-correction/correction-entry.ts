import type {StructuralEntry} from '@portabletext/repair'

export type CorrectionEntry = Omit<StructuralEntry, 'siblings'>
