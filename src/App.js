// Base dependencies
import { version, Component } from 'inferno';
import './registerServiceWorker';
import Unsplash, { toJson } from 'unsplash-js';
// Plugins
import InfiniteScroll from 'react-infinite-scroll-component';
import Modal from 'react-modal';
// CSS and static assets
import Logo from './logo';
import './App.css';
import './modal.css';

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

    // We must unfortunately use an instance variable
    // to manually keep track of a photo's true index
    // relative to the total array for fullView cycling to function
    // correctly.
    this.truePhotoIndex = 0;

    this.resolveOrientationClass = this.resolveOrientationClass.bind(this);
    this.fetchPhotos = this.fetchPhotos.bind(this);
    this.handleHashChange = this.handleHashChange.bind(this);
    this.handleClose = this.handleClose.bind(this);
  }

  componentDidMount() {
    // Fixes inability to enter fullscreen view of same photo after refresh
    if (window.location.hash.length) {
      window.location.hash = '';
    }

    // Initialize an authenticated Unsplash API instance
    this.unsplash = new Unsplash({
      applicationId: process.env.INFERNO_APP_UNSPLASH_ID,
      secret: process.env.INFERNO_APP_UNSPLASH_SECRET,
      callbackUrl: process.env.INFERNO_APP_UNSPLASH_SECRET
    });

    if (this.unsplash.photos) {
      this.fetchPhotos();
    }

    // Event is not synthesized by Inferno, so hook up to it manually
    window.addEventListener('hashchange', this.handleHashChange);
  }

  // Tear-down component properly by removing any manually attached event listeners
  componentWillUnmount() {
    window.removeEventListener('hashchange');
  }

  fetchPhotos() {
    this.unsplash.photos.listPhotos(this.state.currentPage, 25, "latest")
      .then(toJson)
      // eslint-disable-next-line
      .then(apiPhotos => {
        this.setState({hasMore: apiPhotos && apiPhotos.length > 0});

        // Base our continued operations on whether our request returned
        // any meaningful length of data to work with
        if (this.state.hasMore) {
          const formattedPhotos = [];

          // Format and filter out any unneeded properties before adding
          // a new item to our collection
          apiPhotos.forEach((apiPhoto, idx) => {
            const formattedPhotoObj = {
              id: apiPhoto.id,
              pos: this.truePhotoIndex,
              listUrl: apiPhoto.urls.small,
              fullUrl: apiPhoto.urls.regular,
              fullHeight: apiPhoto.height,
              fullWidth: apiPhoto.width,
              userName: apiPhoto.user.name,
              location: apiPhoto.user.location,
              creationDate: apiPhoto.created_at
            }

            formattedPhotoObj.orientation = this.resolveOrientationClass(formattedPhotoObj.fullWidth, formattedPhotoObj.fullHeight);
            this.truePhotoIndex++;

            formattedPhotos.push(formattedPhotoObj);
          });

          this.setState((prevState, props) => ({
            photos: prevState.photos.concat(formattedPhotos),
            currentPage: prevState.currentPage + 1,
            loading: false
          }));
        }
      });
  }

  handleClose() {
    this.setState({isFullView: false});
    window.location.hash = '';
  }

  // A function which takes advantage of the HTML5 location API
  // to switch between gallery and full-view UI contexts
  handleHashChange() {
    if (window.location.hash.indexOf('exit') !== -1) {
      return this.handleClose();
    }

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

  // A function which ingests photo measurements and
  // return the most appropriate CSS class responsible
  // for the container element's aspect ratio
  resolveOrientationClass(width, height) {
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
    // We must use conditional rendering techniques to guard
    // against attempting to access data which does not yet exist
    let photosToRender = this.state.photos && this.state.photos.length ? 
      this.state.photos.map((photo, idx) => (
      <a 
        href={'#' + photo.id} 
        className={photo.orientation}
      >
        <img src={photo.listUrl} alt={'unsplash latest photo ' + idx} />
      </a>
      )) : null;

    let modalContent = this.state.currentPhoto ? (
      <div className='flex-container'>
        {this.state.currentPhoto.pos !== 0 ? <a href={'#' + this.state.prevPhotoHash}><h1>&lt;</h1></a> : null}
        <div>
          <h3>
            {this.state.currentPhoto.userName}
            <br />
            {this.state.currentPhoto.location ? <small>{this.state.currentPhoto.location}</small> : <small>&emsp;</small>}
          </h3>
          <img 
            className={'responsive-img-' + this.state.currentPhoto.orientation}
            src={this.state.currentPhoto.fullUrl}
            alt='Unsplash Full View Placeholder'
          />
          <h5 className='text-right'>{'Uploaded on ' + new Date(this.state.currentPhoto.creationDate).toLocaleDateString()}</h5>
        </div>
        {this.state.currentPhoto.pos !== this.state.photos.length - 1 ? <a href={'#' + this.state.nextPhotoHash}><h1>&gt;</h1></a> : null}
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
          closeTimeoutMS={500}
        >
          <a href='#exit' className='closeButton'><h1>x</h1></a>
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
