import { css } from 'lit-element';

export const fontFamily = css`Consolas, monaco, monospace`;

export const largeBtn = css`
  font-family: ${fontFamily};
  color: white;
  font-size: 1.6rem;
  width: 100%;
  border: 1px solid #676767;
  border-radius: 2px;
  background-color: #121212;
  height: 36px;
  line-height: 36px;
`;

export const info = css`
  font-family: ${fontFamily};
  color: white;
  font-size: 1.2rem;
  width: 100%;
  text-align: center;
  height: 36px;
  line-height: 36px;
`;


export const btn = css`
  font-family: ${fontFamily};
  color: white;
  font-size: 1.3rem;
  width: 100%;
  border: 1px solid #676767;
  border-radius: 2px;
  background-color: #121212;
  height: 36px;
  line-height: 36px;
  padding: 0;
  outline: none;
  user-select: none;
`;

export const btnActive = css`
  background-color: #dc3545;
  border-color: #dc3545;
`
