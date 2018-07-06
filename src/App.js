import { version, Component } from 'inferno';
import './registerServiceWorker';
import Logo from './logo';
import './App.css';
import Unsplash, { toJson } from 'unsplash-js';
import InfiniteScroll from 'react-infinite-scroll-component';
import Modal from 'react-modal';

Modal.setAppElement('#app');

class App extends Component {
  constructor() {
    super();

    this.state = {
      photos: [],
      currentPage: 1,
      hasMore: true,
      isFullView: false,
      prevPhotoHash: '',
      currentPhoto: null,
      nextPhotoHash: ''
    };

    this.unsplash = null;
    this.resolveOrientationClass = this.resolveOrientationClass.bind(this);
    this.fetchPhotos = this.fetchPhotos.bind(this);
    this.handleHashChange = this.handleHashChange.bind(this);
    this.handleClose = this.handleClose.bind(this);
  }

  componentDidMount() {
    this.unsplash = new Unsplash({
      applicationId: "451938f9d0f188efa6822b272c77db0f7773a5866ee7999ed47da3d9c9076e12",
      secret: "451938f9d0f188efa6822b272c77db0f7773a5866ee7999ed47da3d9c9076e12",
      callbackUrl: "urn:ietf:wg:oauth:2.0:oob"
    });

    if (this.unsplash.photos) {
      this.fetchPhotos();
    }

    window.addEventListener('hashchange', this.handleHashChange);
  }

  fetchPhotos() {
    this.unsplash.photos.listPhotos(this.state.currentPage, 25, "latest")
      .then(toJson)
      // eslint-disable-next-line
      .then(apiPhotos => {
        this.setState({hasMore: apiPhotos && apiPhotos.length > 0});

        if (this.state.hasMore) {
          const formattedPhotos = [];
          apiPhotos.forEach((apiPhoto, idx) => {
            const formattedPhotoObj = {
              id: apiPhoto.id,
              pos: idx,
              listUrl: apiPhoto.urls.small,
              fullUrl: apiPhoto.urls.raw,
              fullHeight: apiPhoto.height,
              fullWidth: apiPhoto.width,
              downloadLink: apiPhoto.links.download,
              userData: apiPhoto.user,
              creationDate: apiPhoto.created_at
            }

            formattedPhotos.push(formattedPhotoObj);
          });

          this.setState((prevState, props) => ({
            photos: prevState.photos.concat(formattedPhotos),
            currentPage: prevState.currentPage + 1,
            loading: false
          }));

          console.log(this.state.photos[0].userData);
        }
      });
  }

  handleClose() {
    this.setState({isFullView: false});
    window.location.hash = '';
  }

  handleHashChange() {
    const photoId = window.location.hash.substring(1);

    if (photoId.length) {
      let foundPhoto = this.state.photos.find(photo => photo.id === photoId);

      if (foundPhoto) {
        this.setState({
          prevPhotoHash: this.state.photos[foundPhoto.pos - 1] ? this.state.photos[foundPhoto.pos - 1].id : '',
          currentPhoto: foundPhoto,
          nextPhotoHash: this.state.photos[foundPhoto.pos + 1] ? this.state.photos[foundPhoto.pos + 1].id : '',
          isFullView: true
        });
      }
    }
  }

  resolveOrientationClass(width, height, idx) {
    let resolvedClass = '';

    if (width / height > 1.75 && height / width < 1) {
      resolvedClass = 'horizontal';
    } else if (height / width > 1.25 && width / height < 1) {
      resolvedClass = 'vertical';
    } else {
      if (width >= 3840 && height >= 3840) {
        resolvedClass = 'big';
      }
    }

    return resolvedClass;
  }

  render() {
    let photosToRender = this.state.photos && this.state.photos.length ? 
      this.state.photos.map((photo, idx) => (
      <a 
        href={'#' + photo.id} 
        className={this.resolveOrientationClass(photo.fullWidth, photo.fullHeight, idx)}
      >
        <img src={photo.listUrl} alt={'unsplash latest photo ' + idx} />
      </a>
      )) : <h4>Oops, this shouldn't be happening! Please contact the genius in charge here...</h4>;

    let modalContent = this.state.currentPhoto ? (
      <div className='flex-container'>
        <a href={'#' + this.state.prevPhotoHash}><h1>&lt;</h1></a>
        <div>
          <h3>
            {this.state.currentPhoto.userData.name}
            <br />
            <small>{this.state.currentPhoto.userData.location}</small>
          </h3>
          <img className='responsive-img' src={this.state.currentPhoto.fullUrl} alt='Unsplash Full View Placeholder' />
          <h5 className='text-right'>{'Uploaded on ' + new Date(this.state.currentPhoto.creationDate).toLocaleDateString()}</h5>
        </div>
        <a href={'#' + this.state.nextPhotoHash}><h1>&gt;</h1></a>
      </div>
    ) : <h4>No photo has been selected....</h4>;

    return (
      <div className="App">
        <header className="App-header">
          <h1>
            <Logo width="50" height="50" />
            <span>&emsp;{`InfernoJS ${version} Unsplash Gallery`}</span>
          </h1>
        </header>
        <Modal
          isOpen={this.state.isFullView} 
          onRequestClose={this.handleClose}
        >
          {modalContent}
        </Modal>
        <InfiniteScroll
          dataLength={this.state.photos.length}
          next={this.fetchPhotos}
          hasMore={this.state.hasMore}
          loader={<h4 className='loading'>Fetching Photos...</h4>}
        >
          {photosToRender}
        </InfiniteScroll>
      </div>
    );
  }
}

export default App;
