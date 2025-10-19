import { useEffect, useState } from 'react';
import loginStyles from './login.module.scss';
import Input, { InputType } from '../../../components/input/Input';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    fetch('http://localhost:8000/products')
      .then((res) => res.json())
      .then((data) => console.log(data))
      .catch((err) => console.log(err));
  }, []);

  const handleLogin = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
    //window.location.href = 'http://localhost:8000/auth/google';
    const reqData = {
      email,
      password,
    };
    //fetch('http://localhost:8000/signin', {
    fetch('http://localhost:8000/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reqData),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('Server response:', data);
      })
      .catch((err) => {
        console.error('Error:', err);
      });
  };

  const emailInputProps: InputType = {
    label: { text: 'Email' },
    inputProps: {
      type: 'email',
      placeholder: 'Enter your email',
      name: 'email',
      required: true,
      value: email,
      onChange: (e) => setEmail(e.target.value),
    },
  };

  const pwInputProps: InputType = {
    label: { text: 'Password' },
    inputProps: {
      type: 'password',
      placeholder: 'Enter your password',
      name: 'password',
      required: true,
      value: password,
      onChange: (e) => setPassword(e.target.value),
    },
  };

  console.log('pw: ', password, 'email: ', email);
  return (
    <div className={loginStyles.loginContainer}>
      <h1 className={loginStyles.title}>Sign Up</h1>
      <button>Login with Google</button>
      <form className={loginStyles.loginForm}>
        <Input {...emailInputProps} />
        <Input {...pwInputProps} />
        <div>
          <div>
            <input type="checkbox" />
            <label>Remember me ?</label>
          </div>
          <a>Forget Password</a>
        </div>
        <button onClick={(e) => handleLogin(e)}>Sign in</button>
      </form>
    </div>
  );
}

export default Login;
