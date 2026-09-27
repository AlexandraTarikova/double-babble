import { useState } from 'react';
import { NewTitleWrapper, TextFieldStyled, TitleButton } from './styles';
import type { FC } from 'react';

export const NewTitle: FC<{
  onSubmitTitle: (newName: string) => void;
  onCancelClick: () => void;
}> = ({ onSubmitTitle, onCancelClick }) => {
  const [title, setTitle] = useState('');

  const onClick = (newName: string) => {
    onSubmitTitle(newName);
  };

  return (
    <NewTitleWrapper>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmitTitle(title);
        }}
      >
        <TextFieldStyled
          id="node-title"
          placeholder="Title"
          value={title}
          variant="standard"
          size="medium"
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setTitle(event.target.value);
          }}
          focused={true}
        />
      </form>
      <TitleButton disabled={title === ''} onClick={() => onClick(title)}>
        ok
      </TitleButton>
      <TitleButton onClick={onCancelClick}>x</TitleButton>
    </NewTitleWrapper>
  );
};
