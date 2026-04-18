export type PrinceButtonType =
  | 'Submit'
  | 'Create'
  | 'Edit'
  | 'Back'
  | 'Cancel'
  | 'Pagination'
  | 'Delete'
export type PrinceButtonVariant = 'primary' | 'secondary' | 'danger'
export type PrinceButtonNativeType = 'submit' | 'button'

/** Props for callers of <PrinceButton> */
export interface PrinceButtonProps {
  type: PrinceButtonType
  label?: string
  variant?: PrinceButtonVariant
}

/** Props received by custom button components registered in VuePrinceConfig.buttons */
export interface CustomButtonProps {
  type: PrinceButtonNativeType // native HTML button type, use for <button :type="type">
  label: string // resolved label (from PrinceButtonProps.label or default)
  variant: PrinceButtonVariant // 'primary' | 'secondary' — derived from PrinceButtonType
  princeType: PrinceButtonType // original semantic type, use for conditional rendering
}
