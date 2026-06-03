import PropTypes from 'prop-types';
import cx from 'classnames';
import { flattenToAppURL, flattenScales } from '@plone/volto/helpers/Url/Url';
import { forwardRef, useRef, useState, useEffect } from 'react';
import ResizeObserver from 'resize-observer-polyfill';

const WidthDummy = () => {
  const ref = useRef(null);
  const [width, setWidth] = useState(null);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect && entry.contentRect.width !== width) {
          setWidth(entry.contentRect.width);
        }
      }
    });
    const current = ref.current;
    if (current !== null) {
      observer.observe(current);
    }
    return () => {
      if (current !== null) {
        observer.disconnect();
      }
    };
  }, [ref, width]);
  return [width, <div ref={ref} style={{ width: '100%', height: 0 }} />];
};

/**
 * Image component
 * @param {object} item - Context item that has the image field (can also be a catalog brain or summary)
 * @param {string} imageField - Key of the image field inside the item, or inside the image_scales object of the item if it is a catalog brain or summary
 * @param {string} src - URL of the image to be used if the item field is not available
 * @param {string} alt - Alternative text for the image
 * @param {boolean} loading - (default: eager) set to `lazy` to lazy load the image
 * @param {boolean} responsive - (default: false) set to `true` to add the `responsive` class to the image
 * @param {string} className - Additional classes to add to the image
 * @param {MutableRefObject<HTMLImageElement> | undefined} ref - Reference to the image element.
 */
const Image = forwardRef(({
  item,
  imageField,
  src,
  alt = '',
  loading = 'eager',
  responsive = false,
  className = '',
  ...imageProps
}, ref) => {
  if (!item && !src) return null;
  const [target_width, widthdummy] = WidthDummy();

  // TypeScript hints for editor autocomplete :)
  /** @type {React.ImgHTMLAttributes<HTMLImageElement>} */
  const attrs = {};
  attrs.className = cx(className, { responsive }) || undefined;

  if (!item && src) {
    attrs.src = src;
  } else {
    const isFromRealObject = !item.image_scales;
    const imageFieldWithDefault = imageField || item.image_field || 'image';

    const image = isFromRealObject
      ? flattenScales(item['@id'], item[imageFieldWithDefault])
      : flattenScales(
          item['@id'],
          item.image_scales[imageFieldWithDefault]?.[0],
        );

    if (!image) return null;

    const isSvg = image['content-type'] === 'image/svg+xml';
    // In case `base_path` is present (`preview_image_link`) use it as base path
    const basePath = image.base_path || item['@id'];

    if (!isSvg && image.scales && Object.keys(image.scales).length > 0) {
      const sortedScales = Object.values({
        ...image.scales,
        original: {
          download: `${image.download}`,
          width: image.width,
          height: image.height,
        },
      }).sort((a, b) => {
        if (a.width > b.width) return 1;
        else if (a.width < b.width) return -1;
        else return 0;
      });

      attrs.srcSet = sortedScales
        .map(
          (scale) =>
            `${flattenToAppURL(basePath)}/${scale.download} ${scale.width}w`,
        )
        .join(', ');

      let sizes = '100vw';
      const width = imageProps.width ?? target_width;

      if (width) {
        try {
          const w = Number.parseInt(width);
          let selected_scales = null;
          for (let i = sortedScales.length - 1; i >= 0 ; i--) {
            const scale = sortedScales[i];
            if (scale.width >= w) {
              selected_scales = scale;
            } else {
              break;
            }
          }
          if (selected_scales !== null) {
            attrs.src = `${flattenToAppURL(basePath)}/${selected_scales.download}`;
            attrs.width = selected_scales.width;
            attrs.height = selected_scales.height;
          }
          sizes = `(max-width: ${w}px) 100vw, ${w}px`;
        } catch (e) {
          console.log("exception when selecting default image src attr: " + e)
        }
      }
      attrs.sizes = sizes;
      if (Object.hasOwn(imageProps, 'sizes') && imageProps.sizes === undefined) {
        delete imageProps.sizes;
      }
    }
  }

  if (loading === 'lazy') {
    attrs.loading = 'lazy';
    attrs.decoding = 'async';
  } else {
    attrs.fetchpriority = 'high';
  }

  // eslint-disable-next-line no-restricted-syntax
  return <>{widthdummy}<img {...attrs} alt={alt} ref={ref} {...imageProps} /></>;
});

Image.propTypes = {
  item: PropTypes.shape({
    '@id': PropTypes.string,
    image_field: PropTypes.string,
    image_scales: PropTypes.object,
    image: PropTypes.object,
  }),
  imageField: PropTypes.string,
  src: PropTypes.string,
  alt: PropTypes.string.isRequired,
  loading: PropTypes.string,
  responsive: PropTypes.bool,
  className: PropTypes.string,
};

export default Image;
