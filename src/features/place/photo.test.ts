import { describe, expect, it } from 'vitest'
import {
  commonsFile,
  fileFromClaims,
  photoFromImageInfo,
  photoSource,
  plainText,
} from './photo.ts'

describe('photoSource', () => {
  it('takes a Commons file first, then an image on Commons, then Wikidata', () => {
    expect(
      photoSource({
        wikimedia_commons: 'File:Galata_Tower.jpg',
        image: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Other.jpg',
        wikidata: 'Q1',
      }),
    ).toEqual({ file: 'Galata Tower.jpg' })
    expect(
      photoSource({
        image: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Other.jpg',
        wikidata: 'Q1',
      }),
    ).toEqual({ file: 'Other.jpg' })
    expect(photoSource({ wikidata: 'Q1;Q2' })).toEqual({ wikidata: 'Q1' })
  })

  it('passes over a Commons category, an image elsewhere and no item', () => {
    expect(
      photoSource({
        wikimedia_commons: 'Category:Galata Tower',
        image: 'https://example.com/galata.jpg',
        wikidata: 'Q12506',
      }),
    ).toEqual({ wikidata: 'Q12506' })
    expect(photoSource({ image: 'http://example.com/a.jpg' })).toBeUndefined()
    expect(photoSource({ wikidata: 'Galata' })).toBeUndefined()
    expect(photoSource({})).toBeUndefined()
  })
})

describe('commonsFile', () => {
  it('reads the file from a page, a file link or a thumbnail', () => {
    expect(
      commonsFile('https://commons.wikimedia.org/wiki/File:Ayasofya_2013.jpg'),
    ).toBe('Ayasofya 2013.jpg')
    expect(
      commonsFile(
        'https://commons.wikimedia.org/wiki/Special:FilePath/K%C4%B1z_Kulesi.JPG',
      ),
    ).toBe('Kız Kulesi.JPG')
    expect(
      commonsFile(
        'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Hagia.jpg/640px-Hagia.jpg',
      ),
    ).toBe('Hagia.jpg')
    expect(commonsFile('File:Selimiye.png')).toBe('Selimiye.png')
  })

  it('takes only https links to Commons', () => {
    expect(
      commonsFile('http://upload.wikimedia.org/wikipedia/commons/2/22/A.jpg'),
    ).toBeUndefined()
    expect(commonsFile('https://evil.org/wikipedia/commons/2/22/A.jpg')).toBe(
      undefined,
    )
    expect(
      commonsFile(
        'https://upload.wikimedia.org.evil.org/wikipedia/commons/2/22/A.jpg',
      ),
    ).toBeUndefined()
    expect(commonsFile('javascript:alert(1)')).toBeUndefined()
    expect(commonsFile('https://commons.wikimedia.org/wiki/Main_Page')).toBe(
      undefined,
    )
  })
})

describe('plainText', () => {
  it('takes the text out of an author’s HTML', () => {
    expect(
      plainText(
        '<a href="//commons.wikimedia.org/wiki/User:Ar">Arild&nbsp;V&#229;gen</a> &amp; <b>friends</b>',
      ),
    ).toBe('Arild Vågen & friends')
  })
})

describe('photoFromImageInfo', () => {
  const answer = (info: Record<string, unknown>) => ({
    query: { pages: [{ imageinfo: [info] }] },
  })
  const info = {
    thumburl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/H.jpg/640px-H.jpg',
    thumbwidth: 640,
    thumbheight: 427,
    descriptionurl: 'https://commons.wikimedia.org/wiki/File:H.jpg',
    extmetadata: {
      Artist: { value: '<a href="x">Ana</a>' },
      LicenseShortName: { value: 'CC BY-SA 3.0' },
    },
  }

  it('gives the thumbnail, its size and whom to credit', () => {
    expect(photoFromImageInfo(answer(info))).toEqual({
      src: info.thumburl,
      width: 640,
      height: 427,
      page: info.descriptionurl,
      author: 'Ana',
      license: 'CC BY-SA 3.0',
    })
  })

  it('turns down a thumbnail from anywhere but Commons', () => {
    expect(
      photoFromImageInfo(answer({ ...info, thumburl: 'https://x.org/a.jpg' })),
    ).toBeUndefined()
    expect(
      photoFromImageInfo(
        answer({ ...info, descriptionurl: 'javascript:alert(1)' }),
      ),
    ).toBeUndefined()
    expect(photoFromImageInfo({ query: { pages: [{ missing: true }] } })).toBe(
      undefined,
    )
    expect(photoFromImageInfo(null)).toBeUndefined()
  })
})

describe('fileFromClaims', () => {
  it('takes the preferred image, never a deprecated one', () => {
    const claim = (value: string, rank = 'normal') => ({
      rank,
      mainsnak: { datavalue: { value } },
    })
    expect(
      fileFromClaims({
        claims: {
          P18: [
            claim('Old.jpg', 'deprecated'),
            claim('Normal.jpg'),
            claim('Best_one.jpg', 'preferred'),
          ],
        },
      }),
    ).toBe('Best one.jpg')
    expect(fileFromClaims({ claims: {} })).toBeUndefined()
    expect(
      fileFromClaims({ claims: { P18: [claim('A.jpg', 'deprecated')] } }),
    ).toBeUndefined()
  })
})
