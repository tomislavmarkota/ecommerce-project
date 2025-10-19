import inputStyle from './input.module.scss';

export type LabelProps = {
  text: string;
  labelProps?: React.LabelHTMLAttributes<HTMLLabelElement>;
};

export type InputType = {
  label: LabelProps;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
};

function Input(props: InputType) {
  return (
    <div className={inputStyle.inputContainer}>
      <label className={inputStyle.inputLabel} {...props.label.labelProps}>
        {props.label.text}
      </label>
      <input className={inputStyle.input} {...props.inputProps} />
    </div>
  );
}

export default Input;
