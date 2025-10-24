import inputStyle from './input.module.scss';

export type LabelProps = {
  text: string;
  labelProps?: React.LabelHTMLAttributes<HTMLLabelElement>;
};

export type InputType = {
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
  label?: LabelProps;
  iconComponent?: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & {
      title?: string;
      titleId?: string;
      desc?: string;
      descId?: string;
    }
  >;
};

function Input(props: InputType) {
  return (
    <div className={inputStyle.inputContainer}>
      {props.label && (
        <label className={inputStyle.inputLabel} {...props.label.labelProps}>
          {props.label.text}
        </label>
      )}
      <input className={inputStyle.input} {...props.inputProps} />
      {props.iconComponent && <props.iconComponent className={inputStyle.icon} />}
    </div>
  );
}

export default Input;
