import pageTitleStyles from './pageTitle.module.scss';

type PageTitleProps = {
  name: string;
};

function PageTitle({ name }: PageTitleProps) {
  return <h1 className={pageTitleStyles.title}>{name}</h1>;
}

export default PageTitle;
